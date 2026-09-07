import { useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { searchExercises } from "../lib/exercises";

export default function ExercisePicker() {
    const [query, setQuery] = useState("");
    const results = searchExercises(query);

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.search}
                placeholder="Search exercises"
                placeholderTextColor="#8C8A86"
                value={query}
                onChangeText={setQuery}
            />
            <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.row}>
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.detail}>
                            {item.primaryMuscles.join(", ")}
                            {item.equipment ? " · " + item.equipment : ""}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#131313", padding: 16 },
    search: {
        backgroundColor: "#1C1C1C",
        color: "#F2F0EC",
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    row: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#272727" },
    name: { color: "#F2F0EC", fontSize: 15 },
    detail: { color: "#8C8A86", fontSize: 12, marginTop: 2, textTransform: "capitalize" },
});
